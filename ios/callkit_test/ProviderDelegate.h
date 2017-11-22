//
//  ProviderDelegate.h
//  HelloVideoCall
//
//  Created by Jeffrey on 2017/11/22.
//  Copyright © 2017年 Facebook. All rights reserved.
//

#import <Foundation/Foundation.h>
#import <CallKit/CallKit.h>

static CXProviderConfiguration * providerConfiguration; // GLOBAL

@interface ProviderDelegate : NSObject<CXProviderDelegate>

-(instancetype)init;

@property (strong, nonatomic) CXProvider * provider;
@property (weak, nonatomic) NSTimer * providerTimer;

+(CXProviderConfiguration *)providerConfiguration;
-(void)displayIncomingCall:(NSUUID *)uuid handle:(NSString *)handle hasVideo:(BOOL)flag withCompletion:(void(^)(NSError *error))completion;

@end
